import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, CheckCircle2, AlertCircle, Check, X } from "lucide-react";
import { validatePassword } from "@/lib/passwordValidator";
import { useAuth } from "@/contexts/AuthContext";

/**
 * UpdatePassword Component
 * 
 * Specialized overlay interface presented to authenticated users 
 * arriving from an email recovery link. Allows them to securely 
 * update their account password with real-time strength validation.
 * 
 * Evaluates password strength (length, specific characters) and 
 * verifies matching confirmations before invoking the Supabase user 
 * update methods.
 * 
 * @component
 * @returns {JSX.Element} The rendered password reset form.
 */
export default function UpdatePassword() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordValidation, setPasswordValidation] = useState(validatePassword(""));
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const navigate = useNavigate();
    const { clearPasswordRecovery } = useAuth();

    const handlePasswordChange = (value: string) => {
        setPassword(value);
        setPasswordValidation(validatePassword(value));
    };

    /**
     * Submission handler for the password update form.
     * Validates matching fields and password strength criteria before
     * committing the secure update via the Supabase Auth API.
     * 
     * @async
     * @function handleSubmit
     * @param {React.FormEvent} e - The form submission event.
     * @returns {Promise<void>}
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

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

        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
            toast({ title: "Update failed", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Success", description: "Your password has been securely updated." });
            clearPasswordRecovery();
            navigate("/");
        }

        setLoading(false);
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                        <KeyRound className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Create New Password</CardTitle>
                    <CardDescription>
                        Please enter your new password below.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">New Password <span className="text-red-500">*</span></Label>
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

                        <Button
                            type="submit"
                            className="w-full h-12 mt-4"
                            disabled={loading || !passwordValidation.isValid || password !== confirmPassword}
                        >
                            {loading ? "Updating..." : "Update Password"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
