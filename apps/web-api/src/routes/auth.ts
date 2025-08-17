import { Router } from 'express';
import { z } from 'zod';
import { db, schema } from '../lib/drizzle';
import { hashPassword, verifyPassword, generateJWT } from '../lib/crypto';

const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const router: Router = Router();

// POST /api/auth/register - User registration
router.post('/register', async (req, res) => {
  try {
    const validatedData = CreateUserSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, validatedData.email)
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);

    // Create user
    const [user] = await db.insert(schema.users).values({
      email: validatedData.email,
      password_hash: hashedPassword,
    }).returning();

    // Generate JWT token
    const token = await generateJWT({
      id: user.id,
      email: user.email
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
        },
        token
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Failed to register user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register user',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/auth/login - User login
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Login attempt:', { email: req.body.email, timestamp: new Date().toISOString() });
    
    const validatedData = LoginSchema.parse(req.body);

    // Find user
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, validatedData.email)
    });

    if (!user) {
      console.log('❌ Login failed: User not found for email:', validatedData.email);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Verify password
    const isValidPassword = await verifyPassword(validatedData.password, user.password_hash);

    if (!isValidPassword) {
      console.log('❌ Login failed: Invalid password for user:', user.email);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = await generateJWT({
      id: user.id,
      email: user.email
    });

    console.log('✅ Login successful for user:', user.email, 'User ID:', user.id);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
        },
        token
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    console.error('Failed to login user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to login user'
    });
  }
});

// GET /api/auth/me - Get current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const { verifyJWT } = await import('../lib/crypto');
    const decoded = await verifyJWT(token) as { id: number; email: string };
    
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, decoded.id)
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      }
    });
  } catch (error) {
    console.error('Failed to get current user:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
});

export default router;
