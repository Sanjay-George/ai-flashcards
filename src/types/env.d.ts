// Environment variables type definitions

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            PORT?: string;
            MONGO_USER?: string;
            MONGO_PASSWORD?: string;
            MONGO_HOST?: string;
            MONGO_PORT?: string;
            MONGO_DB?: string;
            FIREBASE_SERVICE_ACCOUNT_PATH?: string;
            FIREBASE_PROJECT_ID?: string;
            FIREBASE_CLIENT_EMAIL?: string;
            FIREBASE_PRIVATE_KEY?: string;
            AI_SERVICE_URL?: string;
            NODE_ENV?: 'development' | 'production' | 'test';
        }
    }
}

export { };
