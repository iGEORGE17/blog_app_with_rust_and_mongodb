// auth.ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      authorize: async (credentials) => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
        })

        const data = await res.json() // This is the object you just showed me

        if (res.ok && data) {
          // We "Flatten" the object here
          return {
            id: data.user.id,
            username: data.user.username,
            email: data.user.email,
            role: data.user.role,
            accessToken: data.access_token, // Map underscore to camelCase for your types
          }
        }
        return null
      }
    }),
  ],
callbacks: {
  async jwt({ token, user }) {
    // 'user' is the flat object returned from authorize() above
    if (user) {
      token.accessToken = (user as any).accessToken
      token.username = (user as any).username
    }
    return token
  },
  async session({ session, token }) {
    // Put the token into the session so useSession() can see it
    if (session.user) {
      (session.user as any).accessToken = token.accessToken;
      (session.user as any).username = token.username;
    }
    return session
  },
},
})

export const GET = handlers.GET
export const POST = handlers.POST
