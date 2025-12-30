import { SupabaseClient } from '@supabase/supabase-js';
import { db } from '../connection';

export abstract class BaseRepository {
  protected db: SupabaseClient;

  constructor() {
    this.db = db.getClient();
  }

  // Add query method for raw SQL queries
  protected async query(text: string, params?: any[]) {
    return await db.query(text, params);
  }

  // Add pool property for compatibility (delegates to db connection)
  protected get pool() {
    return {
      connect: async () => ({
        query: this.query.bind(this),
        release: () => { }
      })
    };
  }

  // Add buildUpdateClause helper method
  protected buildUpdateClause(updates: Record<string, any>) {
    const entries = Object.entries(updates).filter(([_, value]) => value !== undefined);
    const setClause = entries.map(([key, _], index) => `${key} = $${index + 1}`).join(', ');
    const values = entries.map(([_, value]) => value);

    return { setClause, values };
  }

  protected convertCamelToSnake(obj: Record<string, any>): Record<string, any> {
    const converted: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      converted[snakeKey] = value;
    }

    return converted;
  }

  protected convertSnakeToCamel(obj: Record<string, any>): Record<string, any> {
    const converted: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      converted[camelKey] = value;
    }

    return converted;
  }

  protected handleSupabaseError(error: any, operation: string): never {
    console.error(`Supabase ${operation} error:`, error);
    throw new Error(`${operation} failed: ${error.message}`);
  }
}