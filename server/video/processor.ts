import type { FullRecipeInsertDTO } from "@/types/dto/recipe";

import path from "node:path";

import { isInstagramUrl, isInstagramImagePost, processInstagramImagePost } from "./instagram";

import {
  validateVideoLength,
  getVideoMetadata,
  downloadVideo,
  downloadVideoAudio,
  extractAudioFromVideo,
} from "@/server/video/yt-dlp";
import { extractRecipeFromVideo } from "@/server/video/normalizer";
import { cleanupFile } from "@/server/video/cleanup";
import { videoLogger as log } from "@/server/logger";
import { isVideoParsingEnabled, getVideoConfig } from "@/config/server-config-loader";
import { transcribeAudio } from "@/server/ai/transcriber";

export async function processVideoRecipe(
  url: string,
  allergies?: string[]
): Promise<FullRecipeInsertDTO> {
  const videoEnabled = await isVideoParsingEnabled();

  if (!videoEnabled) {
    throw new Error("AI features or video processing is not enabled.");
  }

  let videoPath: string | null = null;
  let audioPath: string | null = null;
  const isInstagram = isInstagramUrl(url);

  try {
    log.info({ url, isInstagram }, "Starting video recipe processing");

    // Get video config to determine storage mode
    const videoConfig = await getVideoConfig();
    const shouldStoreVideo = videoConfig?.storeVideos ?? true;

    log.debug({ shouldStoreVideo }, "Video storage mode");

    // Get metadata first - needed to detect Instagram image posts
    const metadata = await getVideoMetadata(url);

    log.info(
      { url, title: metadata.title, duration: metadata.duration },
      "Video metadata retrieved"
    );

    // Handle Instagram image posts (duration is 0 or undefined)
    if (isInstagram && isInstagramImagePost(metadata)) {
      log.info({ url }, "Detected Instagram image post, extracting from description");

      return await processInstagramImagePost(url, metadata, allergies);
    }

    // Validate video length before downloading (only for actual videos)
    await validateVideoLength(url);
    log.debug({ url }, "Video length validated");

    // Download video or audio based on config
    if (shouldStoreVideo) {
      // MODE 1: Download full video (persistent storage in uploads/video/)
      try {
        videoPath = await downloadVideo(url);
        log.debug({ url, videoPath }, "Video downloaded");
      } catch (videoError: unknown) {
        // Safety net: If video download fails for Instagram, try description-based extraction
        if (isInstagram) {
          log.warn(
            { url, err: videoError },
            "Video download failed for Instagram, attempting description-based extraction"
          );

          return await processInstagramImagePost(url, metadata, allergies);
        }
        throw videoError;
      }

      // Extract video filename for storage in database
      const videoFilename = path.basename(videoPath);

      // Extract audio from downloaded video (temporary storage in uploads/video-temp/)
      audioPath = await extractAudioFromVideo(videoPath);
      log.debug({ url, audioPath }, "Audio extracted from video");

      // Transcribe audio
      log.info({ url }, "Starting audio transcription");
      const transcriptionResult = await transcribeAudio(audioPath);

      if (!transcriptionResult.success) {
        throw new Error(transcriptionResult.error);
      }

      const transcript = transcriptionResult.data;

      log.info({ url, transcriptLength: transcript.length }, "Audio transcribed");

      // Extract recipe from transcript + metadata
      const result = await extractRecipeFromVideo(transcript, metadata, url, allergies);

      if (!result.success) {
        throw new Error(
          result.error ||
            `No recipe found in video. The video may not contain a recipe or the content was not clear enough to extract.`
        );
      }

      // Add videoFilename to the result
      return {
        ...result.data,
        videoFilename,
      };
    } else {
      // MODE 2: Download audio only (no video storage)
      try {
        audioPath = await downloadVideoAudio(url);
        log.debug({ url, audioPath }, "Audio downloaded directly");
      } catch (audioError: unknown) {
        // Safety net: If audio download fails for Instagram, try description-based extraction
        if (isInstagram) {
          log.warn(
            { url, err: audioError },
            "Audio download failed for Instagram, attempting description-based extraction"
          );

          return await processInstagramImagePost(url, metadata, allergies);
        }
        throw audioError;
      }

      // Transcribe audio
      log.info({ url }, "Starting audio transcription");
      const transcriptionResult = await transcribeAudio(audioPath);

      if (!transcriptionResult.success) {
        throw new Error(transcriptionResult.error);
      }

      const transcript = transcriptionResult.data;

      log.info({ url, transcriptLength: transcript.length }, "Audio transcribed");

      // Extract recipe from transcript + metadata
      const result = await extractRecipeFromVideo(transcript, metadata, url, allergies);

      if (!result.success) {
        throw new Error(
          result.error ||
            `No recipe found in video. The video may not contain a recipe or the content was not clear enough to extract.`
        );
      }

      // No videoFilename when not storing videos
      return result.data;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    log.error({ err: error }, "Failed to process video");

    throw new Error(`Failed to process video recipe: ${errorMessage}`);
  } finally {
    // Only cleanup temporary audio file (video stays in uploads/video/ if stored)
    if (audioPath) {
      await cleanupFile(audioPath);
    }
  }
}
