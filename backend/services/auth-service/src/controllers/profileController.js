export function createProfileController({ authService }) {
    return {
        async getProfile(req, res, next) {
            try {
                const result = await authService.getProfile({ userId: req.auth.user.id });
                res.status(result.status.ok ? 200 : 404).json(result);
            } catch (error) { next(error); }
        },
        async updateProfile(req, res, next) {
            try {
                const result = await authService.updateProfile({ userId: req.auth.user.id, displayName: req.body?.displayName, voicePreference: req.body?.voicePreference });
                res.status(result.status.ok ? 200 : 400).json(result);
            } catch (error) { next(error); }
        }
    };
}
