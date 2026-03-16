import { UserDB } from "$lib/server/model/UserDB";
import { JWT_ACCESS_SECRET } from '$env/static/private';
import type { Handle } from "@sveltejs/kit";
import jwt from "jsonwebtoken";
import { error } from "@sveltejs/kit";
import { checkRateLimit } from "$lib/util/RateLimitUtil";

const AUTH_ROUTES = new Set(['/signin', '/signup']);

export const handle: Handle = async function handle({ event, resolve }) {
	// Rate-limit authentication endpoints
	if (AUTH_ROUTES.has(event.url.pathname) && event.request.method === 'POST') {
		const ip = event.getClientAddress();
		if (!checkRateLimit(ip)) {
			return error(429, 'Too many requests. Please try again later.');
		}
	}

	const authCookie = event.cookies.get("AuthorizationToken");
	if (authCookie) {
		// Remove Bearer prefix
		const token = authCookie.split(" ")[1];

		try {
			const jwtUser = jwt.verify(token, JWT_ACCESS_SECRET);
			if (typeof jwtUser === "string") {
				throw new Error("Something went wrong");
			}

			const user = await UserDB.getByUsername(jwtUser.id);

			if (!user) {
				throw new Error("User not found");
			}
			event.locals.user = user;
		} catch (error) {
			console.error(error);
		}
	}

	return await resolve(event);
}