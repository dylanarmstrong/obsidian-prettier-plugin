import 'obsidian';

declare module 'obsidian' {
  interface App {
    commands: {
      commands: {
        'editor:save-file': {
          callback?: () => void;
          checkCallback?: (checking: boolean) => void;
        };
      };
    };
  }

  interface Vault {
    getConfig(id: string): boolean;
  }
}
