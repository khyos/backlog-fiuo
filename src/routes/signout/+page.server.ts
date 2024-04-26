import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = (event) => {
	event.cookies.delete('AuthorizationToken',
		{
			path: '/'
		}
	);

	throw redirect(302, '/signin');
};