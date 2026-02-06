"use client"

import { useState } from "react"
import { 
  DialogRoot, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogBody, 
  DialogFooter, 
  DialogTrigger, 
  DialogCloseTrigger,
  Button, 
  Input, 
  Stack, 
  Text, 
  Field, 
  Link,
  VStack
} from "@chakra-ui/react"
import { useAuth } from "@/contexts/auth" 
import { toaster } from "@/components/ui/toaster"
import { useRouter } from "next/navigation"

export function AuthModal() {
  const [open, setOpen] = useState(false)
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: ""
  })

  // Pull actions from your Context
  const { register, login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isRegisterMode) {
        await register(formData.username, formData.email, formData.password)

        // Trigger Success Toast
        toaster.create({
          title: "Account created.",
          description: `Welcome to Rusto, ${formData.username}!`,
          type: "success",
        })
        setIsRegisterMode(false)
        setFormData({
          username: "",
          email: "",
          password: ""
        })
        router.replace("/dashboard") // Redirect to dashboard after registration
      } else {
        await login(formData.email, formData.password)

        // Trigger Success Toast
        toaster.create({
          title: "Logged in successfully.",
          description: `Welcome back!`,
          type: "success",
        })
        setFormData({
          username: "",
          email: "",
          password: ""
        })
        setOpen(false) // Close modal on successful login
        router.replace("/dashboard") // Redirect to dashboard after login
      }
    } catch (err: any) {
      setError(err.message)
      
      // Trigger Error Toast
      toaster.create({
        title: "Authentication failed",
        description: err.message,
        type: "error",
      })
    } finally {
      setLoading(false)
      // Redirect to homepage after successful login/registration
    }
  }

  return (
    <DialogRoot open={open} onOpenChange={(e) => setOpen(e.open)} placement="center" >
      <DialogTrigger asChild>
        <Button variant="solid" size="sm" colorPalette="blue">
          Get Started
        </Button>
      </DialogTrigger>

      <DialogContent position={"absolute"} top="60px" right={"0px"}  width="full" maxWidth="md" rounded="md" shadow="lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader flexDirection={"column"}>
            <DialogTitle fontSize="2xl" fontWeight="black">
              {isRegisterMode ? "Create Account" : "Welcome Back"}
            </DialogTitle>
            <Text color="fg.muted" fontSize="sm">
              {isRegisterMode ? "Join the Rusto community." : "Sign in to your account."}
            </Text>
          </DialogHeader>

          <DialogBody>
            <Stack gap="4">
              {error && (
                <Text color="red.500" fontSize="xs" p="2" bg="red.50" rounded="md">
                  {error}
                </Text>
              )}

              {isRegisterMode && (
                <Field.Root>
                  <Field.Label>Username</Field.Label>
                  <Input 
                    placeholder="giomalli_001"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    required 
                  />
                </Field.Root>
              )}

              <Field.Root>
                <Field.Label>Email</Field.Label>
                <Input 
                  type="email" 
                  placeholder="me@rusto.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required 
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>Password</Field.Label>
                <Input 
                  type="password" 
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required 
                />
              </Field.Root>
            </Stack>
          </DialogBody>

          <DialogFooter>
            <VStack width="full" gap="4">
              <Button 
                type="submit" 
                colorPalette="blue" 
                loading={loading} 
                width="full"
              >
                {isRegisterMode ? "Register & Sign In" : "Sign In"}
              </Button>
              
              <Text fontSize="xs">
                {isRegisterMode ? "Already have an account?" : "Don't have an account?"}{" "}
                <Link 
                  color="blue.500" 
                  fontWeight="bold"
                  onClick={() => {
                    setIsRegisterMode(!isRegisterMode)
                    setError(null)
                  }}
                >
                  {isRegisterMode ? "Login" : "Sign up"}
                </Link>
              </Text>
            </VStack>
          </DialogFooter>
        </form>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}
