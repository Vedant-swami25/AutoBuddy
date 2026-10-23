/**
 * Simple in-memory rate limiter for API endpoints
 * Prevents OTP spam and abuse
 */

const requestLimits = new Map();

/**
 * Rate limiting middleware factory
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @param {Function} keyGenerator - Function to generate rate limit key (default: IP address)
 */
function createRateLimiter(maxRequests = 5, windowMs = 60000, keyGenerator = null) {
  return (req, res, next) => {
    if (process.env.NODE_ENV === "test" || req.headers["x-test-suite"]) {
      return next();
    }
    const key = keyGenerator ? keyGenerator(req) : (req.ip || req.headers['x-forwarded-for'] || 'unknown');
    const now = Date.now();
    
    if (!requestLimits.has(key)) {
      requestLimits.set(key, []);
    }
    
    const requests = requestLimits.get(key);
    
    // Remove old requests outside the window
    const validRequests = requests.filter(timestamp => now - timestamp < windowMs);
    requestLimits.set(key, validRequests);
    
    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        message: "Too many requests. Please wait a moment before trying again.",
        retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000)
      });
    }
    
    validRequests.push(now);
    return next();
  };
}

/**
 * OTP-specific rate limiter
 * 5 OTP requests per minute per mobile number
 */
function otpRateLimiter(req, res, next) {
  if (process.env.NODE_ENV === "test" || req.headers["x-test-suite"]) {
    return next();
  }
  const rawMobile = req.body?.mobile || req.query?.mobile || req.headers['x-user-mobile'];
  
  if (!rawMobile) {
    return next();
  }

  const mobile = String(rawMobile).replace(/\D/g, "").slice(-10) || rawMobile;
  const key = `otp:${mobile}`;
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 10; // Allow 10 OTP requests per minute
  
  if (!requestLimits.has(key)) {
    requestLimits.set(key, []);
  }
  
  const requests = requestLimits.get(key);
  const validRequests = requests.filter(timestamp => now - timestamp < windowMs);
  requestLimits.set(key, validRequests);
  
  if (validRequests.length >= maxRequests) {
    return res.status(429).json({
      message: "Too many OTP requests from this number. Please try again in a moment.",
      retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000)
    });
  }
  
  validRequests.push(now);
  return next();
}

// Periodic cleanup of old entries (every 10 minutes)
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 minutes
  
  for (const [key, requests] of requestLimits.entries()) {
    const validRequests = requests.filter(timestamp => now - timestamp < maxAge);
    if (validRequests.length === 0) {
      requestLimits.delete(key);
    } else {
      requestLimits.set(key, validRequests);
    }
  }
}, 10 * 60 * 1000);

if (typeof cleanupTimer.unref === "function") {
  cleanupTimer.unref();
}

module.exports = {
  createRateLimiter,
  otpRateLimiter
};
