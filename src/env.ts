import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	DB_PATH: {},
	JWT_ACCESS_SECRET: {},
	IGDB_CLIENT_ID: {},
	IGDB_CLIENT_SECRET: {},
	ITA_APP_ID: {},
	OPEN_CRITIC_RAPID_API_KEY: {},
	TMDB_API_KEY: {},
	TMDB_READ_ACCESS_TOKEN: {}
});
