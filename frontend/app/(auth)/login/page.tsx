import { loginUser } from "./action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-50 font-mono p-4">
      <Card className="w-full max-w-md bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-zinc-100">
            Login to PulseOps
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Enter your email below to access your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* We pass the Server Action directly into the form action */}
          <form action={loginUser} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="rainz@example.com"
                required
                className="bg-zinc-950 border-zinc-800 text-zinc-100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="bg-zinc-950 border-zinc-800 text-zinc-100"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold"
            >
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
