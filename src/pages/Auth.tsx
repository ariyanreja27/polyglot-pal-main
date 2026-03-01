import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, AlertCircle, CheckCircle2, X, Check } from "lucide-react";
import { validatePassword } from "@/lib/passwordValidator";

/**
 * Auth Component
 * 
 * Handles user authentication including login, sign up, password recovery,
 * and OTP email verification. Provides robust password strength validation,
 * inline error messaging, and responsive form toggling.
 * 
 * Includes routing logic customized for Supabase Auth flows,
 * automatically redirecting authenticated users or providing OTP inputs
 * for email confirmations based on project configuration.
 * 
 * @component
 * @example
 * <Route path="/auth" element={<Auth />} />
 * 
 * @returns {JSX.Element} The rendered authentication interface.
 */
export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [agreeTC, setAgreeTC] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState(validatePassword(""));
  const [loading, setLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  /**
   * Resends the OTP verification email to the provided address
   * and starts a 60-second cooldown timer.
   * 
   * @async
   * @function handleResendOTP
   * @returns {Promise<void>}
   */
  const handleResendOTP = async () => {
    if (resendCountdown > 0) return;

    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });

    if (error) {
      toast({ title: "Resend failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Code resent", description: "Please check your email for the new verification code." });
      setResendCountdown(60); // 60 seconds cooldown
    }
    setLoading(false);
  };

  /**
   * Validates the 6-digit OTP code against the Supabase Auth API
   * to confirm the user's email address during sign-up.
   * Automatically routes to the home dashboard on success.
   * 
   * @async
   * @function handleVerifyOTP
   * @param {React.FormEvent} e - The form submittion event.
   * @returns {Promise<void>}
   */
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: 'signup'
    });

    if (error) {
      toast({ title: "Verification failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success!", description: "Account verified. Welcome to Polyglot Pal!" });
      navigate("/");
    }
    setLoading(false);
  };

  /**
   * Initiates the password recovery process by sending a reset link
   * to the provided email address via Supabase.
   * 
   * @async
   * @function handleResetPassword
   * @param {React.FormEvent} e - The form submission event.
   * @returns {Promise<void>}
   */
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: "Email required", description: "Please enter your email.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) {
      toast({ title: "Reset failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email sent", description: "Check your email for the password reset link." });
      setIsForgotPassword(false);
    }
    setLoading(false);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordValidation(validatePassword(value));
  };

  /**
   * Main submission handler for both Login and Registration forms.
   * Validates inputs (name format, password strength, terms agreement)
   * before authenticating or creating a new user in Supabase.
   * Handles immediate login drops or OTP verification routing based
   * on the Supabase project configuration.
   * 
   * @async
   * @function handleSubmit
   * @param {React.FormEvent} e - The form submission event.
   * @returns {Promise<void>}
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const nameRegex = /^[a-zA-Z\s\-'\.]+$/;
    if (!isLogin) {
      if (name.trim().length < 3) {
        toast({ title: "Invalid Name", description: "Name must be at least 3 characters long", variant: "destructive" });
        setLoading(false);
        return;
      }
      if (!nameRegex.test(name)) {
        toast({ title: "Invalid Name", description: "Name can only contain letters, spaces, hyphens, apostrophes and dots", variant: "destructive" });
        setLoading(false);
        return;
      }
    }

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Login failed", description: error.message, variant: "destructive" });
      } else {
        navigate("/");
      }
    } else {
      // Validation for signup
      if (!passwordValidation.isValid) {
        toast({
          title: "Invalid password",
          description: passwordValidation.errors[0],
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        toast({
          title: "Passwords don't match",
          description: "Please ensure both passwords are the same",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!agreeTC) {
        toast({
          title: "Terms not agreed",
          description: "You must agree to the Terms & Conditions",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!name.trim()) {
        toast({
          title: "Name required",
          description: "Please enter your full name",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            phone_number: `${countryCode}${phone}`,
          },
        },
      });

      if (error) {
        toast({ title: "Signup failed", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      // If a session is returned immediately, it means "Confirm Email" is disabled in Supabase.
      // Auto-route them to the dashboard instead of asking for an OTP.
      if (data?.session) {
        toast({ title: "Success!", description: "Account created and logged in." });
        navigate("/");
        return;
      }

      // If user data exists but no session, switch to OTP verification (Confirm Email is ON)
      if (data?.user) {
        setIsVerifyingOTP(true);
        toast({ title: "Check your email", description: "We've sent a 6-digit code to verify your account." });
      }
      setLoading(false);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {isVerifyingOTP ? "Verify Email" : isForgotPassword ? "Reset Password" : isLogin ? "Welcome Back" : "Create Account"}
          </CardTitle>
          <CardDescription>
            {isVerifyingOTP
              ? <div className="space-y-1"><span>Enter the 6-digit code sent to</span><br /><span className="font-medium text-foreground">{email}</span></div>
              : isForgotPassword
                ? "Enter your email to receive a reset link"
                : isLogin
                  ? "Sign in to your vocabulary app"
                  : "Start building your vocabulary"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isVerifyingOTP ? (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  required
                  placeholder="123456"
                  maxLength={6}
                  className="text-center text-2xl tracking-[0.5em] font-bold"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || otpCode.length < 6}>
                {loading ? "Verifying..." : "Verify & Create Account"}
              </Button>
              <div className="mt-4 text-center text-sm text-muted-foreground space-y-2">
                <div>
                  Didn't receive the code?{" "}
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={loading || resendCountdown > 0}
                    className="text-primary hover:underline font-medium disabled:opacity-50 disabled:no-underline"
                  >
                    {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend Code"}
                  </button>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsVerifyingOTP(false);
                      setIsLogin(true);
                    }}
                    className="text-primary hover:underline font-medium"
                  >
                    Cancel & Return to Login
                  </button>
                </div>
              </div>
            </form>
          ) : isForgotPassword ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
              <div className="mt-4 text-center text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="text-primary hover:underline font-medium"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Login Fields */}
                {isLogin && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
                        <button
                          type="button"
                          onClick={() => setIsForgotPassword(true)}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                      />
                    </div>
                  </>
                )}

                {/* Signup Fields */}
                {!isLogin && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder="John Doe"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number (Optional)</Label>
                      <div className="flex gap-2">
                        <Select value={countryCode} onValueChange={setCountryCode}>
                          <SelectTrigger className="w-[100px] sm:w-[120px]">
                            <SelectValue placeholder="Code" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="+1">🇺🇸 +1</SelectItem>
                            <SelectItem value="+44">🇬🇧 +44</SelectItem>
                            <SelectItem value="+91">🇮🇳 +91</SelectItem>
                            <SelectItem value="+61">🇦🇺 +61</SelectItem>
                            <SelectItem value="+81">🇯🇵 +81</SelectItem>
                            <SelectItem value="+49">🇩🇪 +49</SelectItem>
                            <SelectItem value="+33">🇫🇷 +33</SelectItem>
                            <SelectItem value="+86">🇨🇳 +86</SelectItem>
                            {/* Add more as needed */}
                          </SelectContent>
                        </Select>
                        <Input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                          placeholder="5551234567"
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        required
                        placeholder="••••••••"
                      />
                      {/* Password Requirements */}
                      <div className="text-sm space-y-1 mt-2">
                        <div className={`flex items-center gap-2 ${password.length >= 8 && password.length <= 18 ? "text-green-600" : "text-red-600"}`}>
                          <span className="text-xs">
                            {password.length >= 8 && password.length <= 18 ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                          </span>
                          <span className="text-xs">8-18 characters</span>
                        </div>
                        <div className={`flex items-center gap-2 ${/[A-Z]/.test(password) ? "text-green-600" : "text-red-600"}`}>
                          <span className="text-xs">
                            {/[A-Z]/.test(password) ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                          </span>
                          <span className="text-xs">One uppercase letter</span>
                        </div>
                        <div className={`flex items-center gap-2 ${/[a-z]/.test(password) ? "text-green-600" : "text-red-600"}`}>
                          <span className="text-xs">
                            {/[a-z]/.test(password) ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                          </span>
                          <span className="text-xs">One lowercase letter</span>
                        </div>
                        <div className={`flex items-center gap-2 ${/[0-9]/.test(password) ? "text-green-600" : "text-red-600"}`}>
                          <span className="text-xs">
                            {/[0-9]/.test(password) ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                          </span>
                          <span className="text-xs">One number</span>
                        </div>
                        <div className={`flex items-center gap-2 ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? "text-green-600" : "text-red-600"}`}>
                          <span className="text-xs">
                            {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                          </span>
                          <span className="text-xs">One special character</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          placeholder="••••••••"
                          className="pr-10"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {confirmPassword && (
                            password === confirmPassword ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <X className="h-4 w-4 text-red-600" />
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="tc"
                        checked={agreeTC}
                        onCheckedChange={(checked) => setAgreeTC(checked as boolean)}
                      />
                      <Label htmlFor="tc" className="text-sm font-normal cursor-pointer">
                        I agree to the Terms & Conditions
                      </Label>
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || (!isLogin && (!email.trim() || !passwordValidation.isValid || !agreeTC || name.trim().length < 3 || password !== confirmPassword || !/^[a-zA-Z\s\-'\.]+$/.test(name)))}
                >
                  {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
                </Button>
              </form>
              <div className="mt-4 text-center text-sm text-muted-foreground">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    // Reset form when switching
                    setEmail("");
                    setPassword("");
                    setConfirmPassword("");
                    setName("");
                    setPhone("");
                    setAgreeTC(false);
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
