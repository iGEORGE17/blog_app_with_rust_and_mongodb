// auth.ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
authorize: async (credentials) => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    })

    const data = await res.json()
    
    // DEBUG: Log the raw data here to see what the backend ACTUALLY sent
    console.log("RAW BACKEND RESPONSE:", data)

    if (res.ok && data) {
      // THIS OBJECT is what the 'user' variable becomes in the JWT callback
      return {
        id: data.user.id,
        email: data.user.email,
        username: data.user.username,
        accessToken: data.access_token,
      }
    }
    
    return null
  } catch (error) {
    console.error("AUTH_ERROR:", error)
    return null
  }
},
    }),
  ],
  secret: process.env.AUTH_SECRET,
callbacks: {
  async jwt({ token, user }) {
    // This runs on login. 'user' is the flat object from authorize.
    console.log("BOUNCER RECEIVED USER FROM BACKEND:", user)
    if (user) {
      return {
        ...token,
        id: user.id,
        username: user.username,
        accessToken: user.accessToken,
      };
    }
    return token;
  },
  async session({ session, token }) {
    // This runs whenever useSession is called. 
    // It picks up the data from the 'token' above.
    if (session.user) {
      (session.user as any).id = token.id;
      (session.user as any).username = token.username;
      (session.user as any).accessToken = token.accessToken;
    }
    return session;
  },
},
})


export const GET = handlers.GET
export const POST = handlers.POST