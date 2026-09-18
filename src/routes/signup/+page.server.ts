import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { UserDB } from '$lib/server/model/UserDB';
import { ErrorUtil } from '$lib/util/ErrorUtil';

const USERNAME_MIN = 3;
const USERNAME_MAX = 50;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

function validateCredentials(username: string, password: string): string | null {
	if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
		return `Username must be between ${USERNAME_MIN} and ${USERNAME_MAX} characters`;
	}
	if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
		return `Password must be between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters`;
	}
	return null;
}

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

		const username = (formData.username as string).trim();
		const password = formData.password as string;

		const validationError = validateCredentials(username, password);
		if (validationError) {
			return fail(400, {
				error: validationError
			});
		}

        try {
            await UserDB.signUp(username, password);
        } catch (e) {
            return fail(401, {
                error: ErrorUtil.getErrorMessage(e)
            });
        }

		let token: string;
        try {
            token = await UserDB.signIn(username, password);
        } catch (e) {
            return fail(401, {
                error: ErrorUtil.getErrorMessage(e)
            });
        }

		event.cookies.set('AuthorizationToken', `Bearer ${token}`, {
			httpOnly: true,
			path: '/',
			secure: true,
			sameSite: 'strict',
			maxAge: 30 * 60 * 60 * 24 // 30 days
		});

		throw redirect(302, '/');
	}
};