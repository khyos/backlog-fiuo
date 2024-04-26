import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { UserDB } from '$lib/server/model/UserDB';

export const load: PageServerLoad = (event) => {
	const user = event.locals.user;

	if (user) {
		throw redirect(302, '/');
	}
};

export const actions: Actions = {
	default: async (event) => {
		const formData = Object.fromEntries(await event.request.formData());

		if (!formData.username || !formData.password) {
			return fail(400, {
				error: 'Missing username or password'
			});
		}

		const { username, password } = formData;

        let token: string;
        try {
            token = await UserDB.signIn(username as string, password as string);
        } catch (error: any) {
            return fail(401, {
                error: error.message
            });
        }

		event.cookies.set('AuthorizationToken', `Bearer ${token}`, {
			httpOnly: true,
			path: '/',
			secure: true,
			sameSite: 'strict',
			maxAge: 60 * 60 * 24 * 30 // 30 days
		});

		throw redirect(302, '/');
	}
};