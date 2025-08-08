import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { id: string; email: string } | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

// Dummy credentials for testing
const DUMMY_USER = {
  email: 'test@example.com',
  password: 'test123',
};

// Clear any old localStorage data that might cause UUID errors
const clearOldAuthData = () => {
  const userId = localStorage.getItem('userId');
  if (userId && (userId === '123' || userId.length < 10)) {
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
  }
};

async function bootstrapAndGetUserId(email: string): Promise<string | null> {
  try {
    const res = await fetch('/api/_dev/bootstrap-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name: 'Demo User' })
    });
    
    if (!res.ok) {
      console.error('Failed to bootstrap user:', res.status);
      return null;
    }
    
    const data = await res.json();
    if (data.success && data.user?.id) {
      return data.user.id;
    }
    
    return null;
  } catch (error) {
    console.error('Error bootstrapping user:', error);
    return null;
  }
}

export const useAuth = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isLoading: false,
  user: null,

  login: async (email: string, password: string) => {
    // Clear any old data first
    clearOldAuthData();
    
    set({ isLoading: true });
    
    try {
      // Check if credentials match dummy user
      if (email === DUMMY_USER.email && password === DUMMY_USER.password) {
        // Bootstrap user and get real UUID
        const userId = await bootstrapAndGetUserId(email);
        
        if (userId) {
          // Store the real UUID
          localStorage.setItem('userId', userId);
          localStorage.setItem('userEmail', email);
          
          set({
            isAuthenticated: true,
            isLoading: false,
            user: { id: userId, email }
          });
          
          return true;
        }
      }
      
      set({ isLoading: false });
      return false;
    } catch (error) {
      console.error('Login error:', error);
      set({ isLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    set({
      isAuthenticated: false,
      user: null,
      isLoading: false
    });
  }
}));

// Initialize auth state from localStorage
const initializeAuth = () => {
  const userId = localStorage.getItem('userId');
  const userEmail = localStorage.getItem('userEmail');
  
  // Clear invalid data
  if (userId && (userId === '123' || userId.length < 10)) {
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    return;
  }
  
  if (userId && userEmail) {
    useAuth.setState({
      isAuthenticated: true,
      user: { id: userId, email: userEmail }
    });
  }
};

// Initialize on module load
initializeAuth();