/// <reference types="vite/client" />

// Chrome Extension API types
declare namespace chrome {
  namespace storage {
    namespace local {
      function set(items: Record<string, any>): Promise<void>;
      function get(keys?: string | string[] | Record<string, any> | null): Promise<Record<string, any>>;
      function remove(keys: string | string[]): Promise<void>;
    }
  }
}
