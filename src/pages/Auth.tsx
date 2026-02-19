import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, AlertCircle, CheckCircle2 } from "lucide-react";
import { validatePassword } from "@/lib/passwordValidator";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [agreeTC, setAgreeTC] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState(validatePassword(""));
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordValidation(validatePassword(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

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
            phone_number: phone,
          },
        },
      });

      if (error) {
        toast({ title: "Signup failed", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      // If user data exists, try to login
      if (data?.user) {
        // Try to login immediately
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        
        if (!loginError) {
          // Login successful
          toast({ title: "Success!", description: "Welcome to Polyglot Pal!" });
          navigate("/");
        } else {
          // Login failed (likely due to email confirmation requirement)
          if (loginError?.message?.includes("Email") || loginError?.message?.includes("verify")) {
            toast({ 
              title: "Account created", 
              description: "Please check your email to confirm your account, then sign in.",
              variant: "default"
            });
          } else {
            toast({ 
              title: "Account created", 
              description: "Please sign in with your credentials",
              variant: "default"
            });
          }
          // Reset form
          setEmail("");
          setPassword("");
          setConfirmPassword("");
          setName("");
          setPhone("");
          setAgreeTC(false);
          setIsLogin(true);
        }
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
          <CardTitle className="text-2xl">{isLogin ? "Welcome back" : "Create account"}</CardTitle>
          <CardDescription>
            {isLogin ? "Sign in to your vocabulary app" : "Start building your vocabulary"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Login Fields */}
            {isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
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
                  <Label htmlFor="password">Password</Label>
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
                  <Label htmlFor="name">Full Name</Label>
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
                  <Label htmlFor="email">Email</Label>
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
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
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
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                  />
                  {password && confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-600">Passwords do not match</p>
                  )}
                  {password && confirmPassword && password === confirmPassword && (
                    <p className="text-xs text-green-600">Passwords match</p>
                  )}
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
              disabled={loading || (!isLogin && (!passwordValidation.isValid || !agreeTC || !name.trim()))}
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
        </CardContent>
      </Card>
    </div>
  );
}
