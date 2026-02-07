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
import { useRouter, useSearchParams } from "next/navigation"

export function AuthModal() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"


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

  const { register, login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isRegisterMode) {
        // 1. Run registration logic
        await register(formData.username, formData.email, formData.password)

        toaster.create({
          title: "Account created.",
          description: `Welcome to Rusto, ${formData.username}!`,
          type: "success",
        })

        // 2. Log them in immediately after register
        await login(formData.email, formData.password)
        
      } else {
        // 3. Standard Login
        await login(formData.email, formData.password)

        toaster.create({
          title: "Logged in successfully.",
          description: `Welcome back!`,
          type: "success",
        })
      }

      // Success Actions
      setOpen(false)
      setFormData({ username: "", email: "", password: "" })
      router.push(callbackUrl)

    } catch (err: any) {
      setError(err.message)
      toaster.create({
        title: "Authentication failed",
        description: err.message,
        type: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode)
    setError(null)
  }

  return (
    <DialogRoot 
      open={open} 
      onOpenChange={(e) => setOpen(e.open)} 
      placement="center"
      motionPreset="slide-in-bottom"
    >
      <DialogTrigger asChild>
        <Button variant="solid" size="sm" colorPalette="blue" rounded="full" px="5">
          Get Started
        </Button>
      </DialogTrigger>


      <DialogContent 
        width="full" 
        maxWidth="md" 
        rounded="xl" 
        shadow="2xl" 
        border="1px solid" 
        borderColor="border.subtle"
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader pt="6">
            <DialogTitle fontSize="2xl" fontWeight="black" textAlign="center" width="full">
              {isRegisterMode ? "Create Account" : "Welcome Back"}
            </DialogTitle>
            <Text color="fg.muted" fontSize="sm" textAlign="center" width="full" mt="1">
              {isRegisterMode ? "Join the community today." : "Sign in to your account."}
            </Text>
          </DialogHeader>

          <DialogBody pb="6">
            <Stack gap="4">
              {error && (
                <Text 
                  color="red.500" 
                  fontSize="xs" 
                  p="3" 
                  bg="red.50" 
                  rounded="md" 
                  border="1px solid" 
                  borderColor="red.100"
                >
                  {error}
                </Text>
              )}

              {isRegisterMode && (
                <Field.Root>
                  <Field.Label fontWeight="bold" fontSize="xs">Username</Field.Label>
                  <Input 
                    placeholder="giomalli_001"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    required 
                  />
                </Field.Root>
              )}

              <Field.Root>
                <Field.Label fontWeight="bold" fontSize="xs">Email</Field.Label>
                <Input 
                  type="email" 
                  placeholder="me@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required 
                />
              </Field.Root>

              <Field.Root>
                <Field.Label fontWeight="bold" fontSize="xs">Password</Field.Label>
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

          <DialogFooter pb="8">
            <VStack width="full" gap="4">
              <Button 
                type="submit" 
                colorPalette="blue" 
                loading={loading} 
                width="full"
                size="lg"
                fontWeight="bold"
              >
                {isRegisterMode ? "Register & Sign In" : "Sign In"}
              </Button>
              
              <Text fontSize="sm" color="fg.muted">
                {isRegisterMode ? "Already have an account?" : "Don't have an account?"}{" "}
                <Link 
                  as="button"
                  type="button"
                  color="blue.600" 
                  fontWeight="bold"
                  variant="underline"
                  onClick={toggleMode}
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