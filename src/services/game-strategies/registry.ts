import type { Database } from "bun:sqlite";
import { GameTypeStrategy } from "./base";
import { StrokePlayStrategy } from "./stroke-play";

/**
 * Registry for game type strategies
 *
 * Manages available game types and provides strategy instances for games.
 * Uses singleton pattern to ensure consistent registration across the application.
 */
export class GameTypeRegistry {
  private strategies: Map<
    string,
    new (db: Database) => GameTypeStrategy
  > = new Map();

  constructor() {
    // Register default strategies
    this.register(StrokePlayStrategy);

    // Future strategies:
    // this.register(StablefordStrategy);
    // this.register(ScrambleStrategy);
    // this.register(SkinsStrategy);
  }

  /**
   * Register a new game type strategy
   * @param strategyClass - Strategy class constructor
   */
  register(strategyClass: new (db: Database) => GameTypeStrategy): void {
    // Create temporary instance to get metadata
    const tempDb = {} as Database; // Minimal mock for type extraction
    const instance = new strategyClass(tempDb);

    // Register by typeName
    this.strategies.set(instance.typeName, strategyClass);
  }

  /**
   * Get a strategy instance for a given game type
   * @param typeName - Game type identifier (e.g., 'stroke_play')
   * @param db - Database instance
   * @throws Error if strategy not found
   */
  get(typeName: string, db: Database): GameTypeStrategy {
    const StrategyClass = this.strategies.get(typeName);

    if (!StrategyClass) {
      throw new Error(
        `Unknown game type: ${typeName}. Available types: ${this.listAvailable().join(", ")}`
      );
    }

    return new StrategyClass(db);
  }

  /**
   * Check if a game type is registered
   */
  has(typeName: string): boolean {
    return this.strategies.has(typeName);
  }

  /**
   * List all available game type names
   */
  listAvailable(): string[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Get metadata for all registered strategies
   * Returns array of { typeName, displayName }
   */
  getAllMetadata(db: Database): Array<{ typeName: string; displayName: string }> {
    const metadata: Array<{ typeName: string; displayName: string }> = [];

    for (const [typeName, StrategyClass] of this.strategies.entries()) {
      const instance = new StrategyClass(db);
      metadata.push({
        typeName: instance.typeName,
        displayName: instance.displayName,
      });
    }

    return metadata;
  }
}

/**
 * Singleton instance of the registry
 * Import this to access game type strategies throughout the application
 */
export const gameTypeRegistry = new GameTypeRegistry();
