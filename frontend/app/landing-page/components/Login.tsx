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
import { supabase } from "@/lib/supabase";

export const LoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginData = z.infer<typeof LoginSchema>;

interface Props {
  trigger?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitch: () => void;
}

const Login = ({ trigger, open, onOpenChange, onSwitch }: Props) => {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const handler = useForm<LoginData>({
    resolver: zodResolver(LoginSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { control } = handler;

  const onSubmit = async (values: LoginData) => {
    setLoading(true);
    setAuthError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email.trim(),
        password: values.password,
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      if (!data.user || !data.session) {
        setAuthError(
          "Login failed. Please check your credentials and try again.",
        );
        return;
      }

      handler.reset();
      onOpenChange(false);

      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Login failed:", error);

      setAuthError(
        "Unable to log in. Please check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent className="sm:max-w-lg w-full rounded-lg">
        <DialogTitle className="text-xl md:text-2xl pt-2 font-semibold text-center">
          Welcome Back to LuSense
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
                    autoComplete="current-password"
                    placeholder="Enter your password"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <p className="text-blue-500">Forgot your password?</p>

            {authError && (
              <p role="alert" className="text-sm text-red-500">
                {authError}
              </p>
            )}

            <div className="flex gap-x-3">
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Logging in..." : "Login"}
              </Button>
            </div>
          </form>
        </Form>

        <div className="flex flex-col items-center text-center text-secondary-foreground space-y-2">
          <p className="font-semibold">
            Don&apos;t have LuSense yet?{" "}
            <button
              type="button"
              className="cursor-pointer underline"
              onClick={onSwitch}
            >
              Sign up
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

export default Login;
