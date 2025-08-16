import { Request, Response, NextFunction } from 'express';
import { verifyJWT } from './crypto';
import { db, schema } from './drizzle';
import { eq } from 'drizzle-orm';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
      };
    }
  }
}

// Authentication middleware
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required'
      });
      return;
    }

    const decoded = await verifyJWT(token) as { id: number; email: string };
    
    // Verify user still exists in database
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, decoded.id)
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
}

// Optional authentication middleware (doesn't fail if no token)
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = await verifyJWT(token) as { id: number; email: string };
      
      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, decoded.id)
      });

      if (user) {
        req.user = {
          id: user.id,
          email: user.email
        };
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
}

// Check if user owns resource
export function requireOwnership(resourceUserId: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    if (req.user.id !== resourceUserId) {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }

    next();
  };
}

// Admin middleware (placeholder for future admin functionality)
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
    return;
  }

  // TODO: Add admin role check when implemented
  // For now, allow all authenticated users
  next();
}

// Generate session token for Verify Now
export async function generateVerifyNowToken(accountId: number, userId: number): Promise<string> {
  const payload = {
    accountId,
    userId,
    type: 'verify_now',
    exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
  };

  const jwt = await import('jsonwebtoken');
  return jwt.sign(payload, process.env.JWT_SECRET!);
}

// Verify session token for Verify Now
export async function verifyVerifyNowToken(token: string): Promise<{ accountId: number; userId: number } | null> {
  try {
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    if (decoded.type !== 'verify_now') {
      return null;
    }

    return {
      accountId: decoded.accountId,
      userId: decoded.userId,
    };
  } catch (error) {
    return null;
  }
}
