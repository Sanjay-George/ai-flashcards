// Environment variables type definitions for Bun

declare module "bun" {
    interface Env {
        PORT?: string;
        MONGODB_URI?: string;
        AI_SERVICE_URL?: string;
        NODE_ENV?: 'development' | 'production' | 'test';
    }
}

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            PORT?: string;
            MONGODB_URI?: string;
            AI_SERVICE_URL?: string;
            NODE_ENV?: 'development' | 'production' | 'test';
        }
    }
}

export { };
