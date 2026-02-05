import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';

// JWT Secret (deve essere configurato in .env)
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_SECRET_IN_PRODUCTION_ENV';
const JWT_EXPIRES_IN = '24h'; // Token valido per 24 ore

if (!process.env.JWT_SECRET) {
    console.warn('⚠️ JWT_SECRET non configurato! Usando valore di default NON SICURO');
}

// Interfaccia per il payload JWT
export interface JWTPayload {
    id: number;
    role: 'admin' | 'staff';
    firstName: string;
    lastName: string;
    tableCode?: string;
    permissions?: any;
}

// Estensione di Request per includere user autenticato
declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
        }
    }
}

/**
 * Genera un JWT token per admin o staff
 */
export function generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verifica e decodifica un JWT token
 */
export function verifyToken(token: string): JWTPayload {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

/**
 * Middleware: Richiede autenticazione JWT valida
 * Estrae il token da Authorization header e verifica validità
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Autenticazione richiesta',
                code: 'AUTH_REQUIRED'
            });
        }

        const token = authHeader.substring(7); // Rimuove "Bearer "

        try {
            const decoded = verifyToken(token);

            // Verifica che l'utente esista ancora nel database
            if (decoded.role === 'admin') {
                const admin = await prisma.admin.findFirst({
                    where: { id: decoded.id }
                });

                if (!admin) {
                    return res.status(401).json({
                        error: 'Account non trovato',
                        code: 'ACCOUNT_NOT_FOUND'
                    });
                }
            } else if (decoded.role === 'staff') {
                const staff = await prisma.staff.findUnique({
                    where: { id: decoded.id }
                });

                if (!staff || !staff.isActive) {
                    return res.status(401).json({
                        error: 'Account non trovato o disabilitato',
                        code: 'ACCOUNT_DISABLED'
                    });
                }
            }

            // Aggiungi user al request
            req.user = decoded;
            next();
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                return res.status(401).json({
                    error: 'Token scaduto, effettua nuovamente il login',
                    code: 'TOKEN_EXPIRED'
                });
            } else if (error instanceof jwt.JsonWebTokenError) {
                return res.status(401).json({
                    error: 'Token non valido',
                    code: 'TOKEN_INVALID'
                });
            }
            throw error;
        }
    } catch (error) {
        console.error('Error in requireAuth middleware:', error);
        return res.status(500).json({ error: 'Errore interno del server' });
    }
}

/**
 * Middleware: Richiede ruolo admin
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
        return res.status(401).json({
            error: 'Autenticazione richiesta',
            code: 'AUTH_REQUIRED'
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            error: 'Accesso negato: permessi insufficienti',
            code: 'INSUFFICIENT_PERMISSIONS'
        });
    }

    next();
}

/**
 * Middleware: Richiede ruolo admin o staff
 */
export function requireAdminOrStaff(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
        return res.status(401).json({
            error: 'Autenticazione richiesta',
            code: 'AUTH_REQUIRED'
        });
    }

    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
        return res.status(403).json({
            error: 'Accesso negato: permessi insufficienti',
            code: 'INSUFFICIENT_PERMISSIONS'
        });
    }

    next();
}

/**
 * Middleware: Richiede permesso specifico staff
 * Se l'utente è admin, passa sempre
 * Se è staff, verifica che abbia il permesso richiesto
 */
export function requirePermission(permission: string) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Autenticazione richiesta',
                code: 'AUTH_REQUIRED'
            });
        }

        // Admin ha tutti i permessi
        if (req.user.role === 'admin') {
            return next();
        }

        // Staff deve avere il permesso specifico
        if (req.user.role === 'staff') {
            const permissions = req.user.permissions || {};

            if (!permissions[permission]) {
                return res.status(403).json({
                    error: `Permesso negato: ${permission} richiesto`,
                    code: 'PERMISSION_DENIED'
                });
            }

            return next();
        }

        return res.status(403).json({
            error: 'Accesso negato',
            code: 'ACCESS_DENIED'
        });
    };
}
