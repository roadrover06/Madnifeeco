// src/pages/Login.js
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail, fetchSignInMethodsForEmail } from 'firebase/auth';
import { auth } from '../firebase';
import {
  TextField, Button, Container, Typography, Box, Alert,
  CssBaseline, Fade, CircularProgress, Divider, InputAdornment,
  Snackbar, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import coffeeLogo from '../assets/coffee-logoo.jpg';
import { Email, Lock, Close, Visibility, VisibilityOff } from '@mui/icons-material';

const theme = createTheme({
  palette: {
    primary: {
      main: '#6F4E37', // Rich coffee brown
      light: '#A78A7F', // Lighter coffee
      dark: '#4E3524', // Dark coffee
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#D7A56D', // Coffee cream
    },
    background: {
      default: '#F9F5F2', // Warm off-white
    },
    text: {
      primary: '#3E2723', // Dark brown
      secondary: '#8D6E63', // Medium brown
    },
    error: {
      main: '#D32F2F',
    },
    success: {
      main: '#2E7D32',
    },
  },
  typography: {
    fontFamily: '"Poppins", "Inter", sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: '0.5px',
    },
    h5: {
      fontWeight: 500,
      fontSize: '1.25rem',
    },
    body1: {
      fontWeight: 400,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
      letterSpacing: '0.5px',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '&.Mui-focused fieldset': {
              borderWidth: '1px',
            },
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          transition: 'all 0.2s ease',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          }
        }
      },
    },
  },
});

// Replace single background image with an array of animated images
const backgroundImages = [
  'https://images.unsplash.com/photo-1445116572660-236099ec97a0?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1464983953574-0892a716854b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1511920170033-f8396924c348?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80',
  // Add more cafe/coffee shop images as desired
];

const ANIMATION_INTERVAL = 6000; // ms

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);
  const [forgotDialogOpen, setForgotDialogOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % backgroundImages.length);
    }, ANIMATION_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setSnackbar({
        open: true,
        message: 'Login successful! Redirecting...',
        severity: 'success',
      });
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      let errorMessage = err.message;
      if (err.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      }
      setError(errorMessage);
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
      setLoading(false);
    }
  };

  const handleForgotOpen = () => {
    setForgotDialogOpen(true);
    setForgotEmail('');
    setForgotError('');
  };

  const handleForgotClose = () => {
    setForgotDialogOpen(false);
    setForgotEmail('');
    setForgotError('');
  };

  const handleForgotSubmit = async (e) => {
  e.preventDefault();
  setForgotLoading(true);
  setForgotError('');
  try {
    const emailToCheck = forgotEmail.trim().toLowerCase();
    
    // First try to send the reset email directly
    try {
      await sendPasswordResetEmail(auth, emailToCheck);
      setForgotDialogOpen(false);
      setSnackbar({
        open: true,
        message: 'Password reset email sent! Please check your inbox.',
        severity: 'success',
      });
      setForgotLoading(false);
      return;
    } catch (sendError) {
      // If sending fails, check if email exists
      try {
        const methods = await fetchSignInMethodsForEmail(auth, emailToCheck);
        if (!methods || methods.length === 0) {
          setForgotError('No account found with this email.');
          setForgotLoading(false);
          return;
        }
        // If email exists but sending failed for another reason
        setForgotError('Failed to send reset email. Please try again later.');
      } catch (checkError) {
        setForgotError('Error checking email. Please try again.');
      }
    }
  } catch (err) {
    if (err.code === 'auth/invalid-email') {
      setForgotError('Please enter a valid email address.');
    } else {
      setForgotError('An error occurred. Please try again.');
      console.error('Password reset error:', err);
    }
  }
  setForgotLoading(false);
};

  return (
    <ThemeProvider theme={theme}>
      {/* Animated background images */}
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        {backgroundImages.map((img, idx) => (
          <Box
            key={img}
            sx={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(rgba(79, 55, 39, 0.7), rgba(79, 55, 39, 0.9)), url(${img}) center/cover no-repeat fixed`,
              opacity: idx === bgIndex ? 1 : 0,
              transition: 'opacity 1.5s cubic-bezier(0.4,0,0.2,1)',
              willChange: 'opacity',
            }}
          />
        ))}
      </Box>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // Remove background here so animated images show through
          background: 'none',
          position: 'relative',
          zIndex: 1,
          p: 2,
        }}
      >
        <Container component="main" maxWidth="xs" disableGutters>
          <CssBaseline />
          <Fade in={true} timeout={700}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%',
                backdropFilter: 'blur(8px) saturate(180%)',
                background: 'rgba(255, 249, 242, 0.88)',
                borderRadius: 4,
                boxShadow: '0 12px 40px rgba(79, 55, 39, 0.25)',
                px: { xs: 2, sm: 4 },
                py: { xs: 3, sm: 5 },
                border: '1px solid rgba(255, 255, 255, 0.18)',
                overflow: 'hidden',
                position: 'relative',
                '&:before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(90deg, #6F4E37 0%, #D7A56D 50%, #6F4E37 100%)',
                }
              }}
            >
              <Box
                component="img"
                src={coffeeLogo}
                alt="Madnifeeco Logo"
                sx={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  mb: 2,
                  border: '3px solid white',
                  boxShadow: '0 4px 20px rgba(111, 78, 55, 0.3)',
                  transition: 'transform 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.05) rotate(5deg)',
                  }
                }}
              />
              <Typography
                component="h1"
                variant="h4"
                sx={{
                  mb: 0.5,
                  color: 'primary.dark',
                  fontWeight: 700,
                  letterSpacing: '1px',
                  background: 'linear-gradient(135deg, #6F4E37 0%, #D7A56D 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 2px 4px rgba(0,0,0,0.05)',
                }}
              >
                MADNIFEECO
              </Typography>
              <Typography
                variant="subtitle2"
                sx={{
                  mb: 3,
                  color: 'text.secondary',
                  fontWeight: 400,
                  fontSize: '0.95rem',
                  textAlign: 'center',
                  maxWidth: '80%',
                  lineHeight: 1.5,
                }}
              >
                "Your perfect cup starts here. Manage your coffee shop with ease."
              </Typography>
              
              <Box
                sx={{
                  width: '100%',
                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                  borderRadius: 3,
                  boxShadow: '0 2px 12px rgba(111, 78, 55, 0.08)',
                  p: { xs: 2.5, sm: 3.5 },
                  border: '1px solid rgba(111, 78, 55, 0.1)',
                }}
              >
                {error && (
                  <Alert
                    severity="error"
                    sx={{
                      mb: 3,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'error.main',
                      bgcolor: 'rgba(211, 47, 47, 0.08)',
                    }}
                  >
                    {error}
                  </Alert>
                )}
                <Box
                  component="form"
                  onSubmit={handleSubmit}
                  noValidate
                  sx={{ mt: 1 }}
                >
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="email"
                    label="Email Address"
                    name="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    variant="outlined"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'rgba(255, 255, 255, 0.8)',
                        '& fieldset': {
                          borderColor: 'rgba(111, 78, 55, 0.15)',
                        },
                        '&:hover fieldset': {
                          borderColor: 'primary.light',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: 'primary.main',
                          borderWidth: '1px',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: 'text.secondary',
                        '&.Mui-focused': {
                          color: 'primary.main',
                        }
                      }
                    }}
                  />
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    name="password"
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    variant="outlined"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            onClick={() => setShowPassword((show) => !show)}
                            edge="end"
                            size="small"
                            tabIndex={-1}
                            sx={{ color: 'text.secondary' }}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      mb: 1,
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'rgba(255, 255, 255, 0.8)',
                        '& fieldset': {
                          borderColor: 'rgba(111, 78, 55, 0.15)',
                        },
                        '&:hover fieldset': {
                          borderColor: 'primary.light',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: 'primary.main',
                          borderWidth: '1px',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: 'text.secondary',
                        '&.Mui-focused': {
                          color: 'primary.main',
                        }
                      }
                    }}
                  />
                  <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 3
                  }}>
                    <Typography
                      component="button"
                      type="button"
                      variant="body2"
                      onClick={handleForgotOpen}
                      sx={{
                        color: 'primary.main',
                        textDecoration: 'none',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        p: 0,
                        m: 0,
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        transition: 'color 0.2s ease',
                        '&:hover': {
                          textDecoration: 'underline',
                          color: 'primary.dark',
                        },
                      }}
                    >
                      Forgot password?
                    </Typography>
                  </Box>
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={loading}
                    sx={{
                      mb: 2,
                      py: 1.5,
                      borderRadius: 2,
                      fontWeight: 600,
                      fontSize: '1rem',
                      letterSpacing: '0.5px',
                      bgcolor: 'primary.main',
                      background: 'linear-gradient(135deg, #6F4E37 0%, #8D6E63 100%)',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                        background: 'linear-gradient(135deg, #5C3D2E 0%, #6F4E37 100%)',
                        transform: 'translateY(-2px)',
                      },
                      '&:active': {
                        transform: 'translateY(0)',
                      },
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    {loading ? (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CircularProgress size={24} color="inherit" sx={{ mr: 2 }} />
                        Signing In...
                      </Box>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                  <Divider sx={{ my: 3, color: 'text.secondary', '&:before, &:after': {
                    borderColor: 'rgba(111, 78, 55, 0.15)',
                  } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                      or continue with
                    </Typography>
                  </Divider>
                  <Box sx={{
                    textAlign: 'center',
                    mt: 2
                  }}>
                    <Typography variant="body2" sx={{
                      color: 'text.secondary',
                      fontWeight: 400,
                      fontSize: '0.95rem',
                    }}>
                      New to Madnifeeco?{' '}
                      <Typography
                        component={Link}
                        to="/register"
                        variant="body2"
                        sx={{
                          color: 'primary.main',
                          fontWeight: 600,
                          textDecoration: 'none',
                          '&:hover': {
                            textDecoration: 'underline',
                            color: 'primary.dark',
                          },
                          transition: 'color 0.2s ease',
                        }}
                      >
                        Create an account
                      </Typography>
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Fade>
        </Container>

        {/* Forgot Password Dialog */}
        <Dialog open={forgotDialogOpen} onClose={handleForgotClose} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, textAlign: 'center', pb: 0 }}>
            Reset Password
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              Enter your email address and we'll send you a link to reset your password.
            </Typography>
            <Box component="form" onSubmit={handleForgotSubmit}>
              <TextField
                autoFocus
                margin="dense"
                label="Email Address"
                type="email"
                fullWidth
                required
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                variant="outlined"
                disabled={forgotLoading}
              />
              {forgotError && (
                <Alert severity="error" sx={{ mt: 2, mb: 0 }}>
                  {forgotError}
                </Alert>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleForgotClose} disabled={forgotLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleForgotSubmit}
              variant="contained"
              color="primary"
              disabled={forgotLoading || !forgotEmail}
              sx={{ fontWeight: 600 }}
            >
              {forgotLoading ? <CircularProgress size={20} /> : 'Send Reset Link'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar Notification */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{
            '& .MuiSnackbarContent-root': {
              borderRadius: 2,
            }
          }}
        >
          <Alert
            elevation={6}
            variant="filled"
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            sx={{
              width: '100%',
              alignItems: 'center',
              borderRadius: 2,
            }}
            iconMapping={{
              success: <img src={coffeeLogo} alt="" style={{ width: 24, height: 24, marginRight: 8, borderRadius: '50%' }} />,
              error: <img src={coffeeLogo} alt="" style={{ width: 24, height: 24, marginRight: 8, borderRadius: '50%', filter: 'grayscale(100%)' }} />,
            }}
            action={
              <IconButton
                size="small"
                aria-label="close"
                color="inherit"
                onClick={handleCloseSnackbar}
              >
                <Close fontSize="small" />
              </IconButton>
            }
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
};

export default Login;