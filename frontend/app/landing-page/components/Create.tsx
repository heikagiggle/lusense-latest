"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/app/components/widgets/button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/app/components/icons/logo";
import { supabase } from "@/lib/supabase";

export const CreateSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type CreateData = z.infer<typeof CreateSchema>;

interface Props {
  trigger?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitch: () => void;
}

const Create = ({ trigger, open, onOpenChange, onSwitch }: Props) => {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [authError, setAuthError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");

  const handler = useForm<CreateData>({
    resolver: zodResolver(CreateSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { control } = handler;

  const onSubmit = async (values: CreateData) => {
    setLoading(true);
    setAuthError("");
    setSuccessMessage("");
    setPendingEmail("");

    try {
      const email = values.email.trim();

      const { data, error } = await supabase.auth.signUp({
        email,
        password: values.password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      if (!data.user) {
        setAuthError("Unable to process signup. Please try again.");
        return;
      }

      if (!data.session) {
        setPendingEmail(email);

        setSuccessMessage(
          "If this email is eligible for registration, you will receive a confirmation link. Please check your inbox and spam folder. If you already have an account, log in instead.",
        );

        handler.reset({
          email,
          password: "",
        });

        return;
      }

      handler.reset();
      setPendingEmail("");
      onOpenChange(false);

      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error("Signup failed:", error);

      setAuthError(
        "Something went wrong while creating your account. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const resendConfirmation = async () => {
    if (!pendingEmail || resending) return;

    setResending(true);
    setAuthError("");
    setSuccessMessage("");

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: pendingEmail,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      setSuccessMessage(
        "If this account is awaiting confirmation and email delivery is available, a new confirmation link will be sent. Please check your inbox and spam folder.",
      );
    } catch (error) {
      console.error("Resend confirmation failed:", error);

      setAuthError(
        "Unable to resend the confirmation email. Please try again later.",
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent className="sm:max-w-lg w-full rounded-lg">
        <div className="h-10 w-10 flex items-center justify-center">
          <Logo />
        </div>

        <DialogTitle className="text-xl md:text-2xl pt-2 font-semibold text-center">
          Welcome to LuSense
        </DialogTitle>

        <DialogDescription></DialogDescription>
        <Form {...handler}>
          <form
            onSubmit={handler.handleSubmit(onSubmit)}
            className="space-y-3 w-full flex flex-col justify-center p-4"
          >
            <FormField
              control={control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <Input
                    {...field}
                    type="email"
                    autoComplete="email"
                    placeholder="Enter your email"
                    disabled={loading || resending}
                    onChange={(event) => {
                      field.onChange(event);
                      setPendingEmail("");
                      setSuccessMessage("");
                      setAuthError("");
                    }}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="password"
              render={({ field }) => (
                <FormItem className="mt-3">
                  <FormLabel>Password</FormLabel>
                  <Input
                    {...field}
                    type="password"
                    autoComplete="new-password"
                    placeholder="Enter your password"
                    disabled={loading || resending}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <p className="text-muted-foreground">
              Tip: Use a mix of letters, numbers and symbols for a stronger
              password.
            </p>

            {authError && (
              <p role="alert" className="text-sm text-red-500">
                {authError}
              </p>
            )}

            {successMessage && (
              <p role="status" className="text-sm text-green-600">
                {successMessage}
              </p>
            )}

            {pendingEmail && (
              <button
                type="button"
                onClick={resendConfirmation}
                disabled={loading || resending}
                className="text-sm font-medium text-blue-700 underline disabled:opacity-50"
              >
                {resending ? "Sending..." : "Resend confirmation email"}
              </button>
            )}

            <div className="mt-2">
              <Button
                type="submit"
                disabled={loading || resending}
                className="w-full"
              >
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </div>
          </form>
        </Form>

        <div className="flex flex-col items-center text-center text-secondary-foreground space-y-2">
          <p className="font-semibold">
            Already have a LuSense account?{" "}
            <button
              type="button"
              onClick={onSwitch}
              className="cursor-pointer underline"
            >
              Login
            </button>
          </p>

          <p>
            By continuing, you agree to LuSense&apos;s{" "}
            <a href="#terms" className="underline">
              Terms of Service
            </a>{" "}
            and acknowledge you&apos;ve read our{" "}
            <a href="#privacy" className="underline">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Create;
