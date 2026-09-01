import { unary } from '../grpc/unary.js';
import { createRequestContext } from '../utils/requestContext.js';

function accessTokenFrom(req) { return req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.body?.accessToken || ''; }

export function createAuthController({ authClient }) {
    const call = (method, body) => unary(authClient, method, body);
    return {
        async register(req, res, next) {
            try {
                res.json(await call('Register', {
                    context: createRequestContext(req),
                    email: req.body.email || '',
                    password: req.body.password || '',
                    displayName: req.body.displayName || '',
                    voicePreference: req.body.voicePreference || 'female'
                }));
            }
            catch (error) {
                next(error);
            }
        },


        async login(req, res, next) {
            try {
                res.json(await call('Login', {
                    context: createRequestContext(req),
                    email: req.body.email || '',
                    password: req.body.password || ''
                }));
            }
            catch (error) {
                next(error);
            }
        },
        async verifyToken(req, res, next) {
            try {
                res.json(await call('VerifyToken', {
                    context: createRequestContext(req),
                    accessToken: accessTokenFrom(req)
                }));
            }
            catch (error) {
                next(error);
            }
        },
        async refreshToken(req, res, next) {
            try {
                res.json(await call('RefreshToken', {
                    context: createRequestContext(req),
                    refreshToken: req.body.refreshToken || ''
                }));
            }
            catch (error) {
                next(error);
            }
        },
        async getProfile(req, res, next) {
            try {
                res.json(await call('GetProfile', {
                    context: createRequestContext(req),
                    accessToken: accessTokenFrom(req)
                }));
            }
            catch (error) {
                next(error);
            }
        },
        async updateProfile(req, res, next) {
            try {
                res.json(await call('UpdateProfile', {
                    context: createRequestContext(req),
                    accessToken: accessTokenFrom(req),
                    displayName: req.body.displayName || '',
                    voicePreference: req.body.voicePreference || ''
                }));
            }
            catch (error) {
                next(error);
            }
        }
    };
}
