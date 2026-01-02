/**
 * Shared type definitions for the golf series frontend
 *
 * This module re-exports all type definitions from specialized type files
 * for convenient importing throughout the codebase.
 */

export type {
  ParticipantData,
  ParticipantScore,
  PlayerForRoundCheck,
} from "./participant";

export type {
  ScoreStatistics,
  TeamParticipantEntry,
  TeamResult,
  TeamResultInput,
  TeamResultWithPoints,
} from "./scoring";
