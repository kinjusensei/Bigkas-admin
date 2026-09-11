'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()

    // Step 1 — Sign in
    const { data, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      })

    if (signInError || !data.user) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }

    // Step 2 — Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, display_name')
      .eq('id', data.user.id)
      .single()

    if (profileError || !profile) {
      await supabase.auth.signOut()
      setError('Account not found. Please contact support.')
      setLoading(false)
      return
    }

    if (profile.role !== 'admin') {
      await supabase.auth.signOut()
      setError('Access denied. This portal is for administrators only.')
      setLoading(false)
      return
    }

    // Step 3 — Admin confirmed, go to dashboard
    router.push('/dashboard')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#410FA3',
      }}
    >
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div
          style={{
            width: 90,
            height: 90,
            flexShrink: 0,
            borderRadius: 18,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
            }}
        >
          <Image
            src="/logo.web.png"
            alt="Bigkas Dashboard"
            width={70}
            height={70}
            style={{ objectFit: 'contain' }}
          />
        </div>

        <div
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.5px',
          }}
        >
          Bigkas Admin Website
        </div>

        <div
          style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.7)',
            marginTop: 4,
          }}
        >

        </div>
      </div>

      {/* Card */}
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: '32px 32px 28px',
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#111827',
            marginBottom: 4,
            textAlign: 'center',
          }}
        >
          Admin Login
        </div>

        <div
          style={{
            fontSize: 13,
            color: '#9CA3AF',
            marginBottom: 24,
            textAlign: 'center',
          }}
        >
          Only administrators can access this portal
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: '#FEE2E2',
              border: '1px solid #FECACA',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13,
              color: '#991B1B',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
            }}
          >
            <Image
              src="/danger.png"
              alt="Error"
              width={18}
              height={18}
              style={{ objectFit: 'contain', flexShrink: 0 }}
            />

            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: '#6B7280',
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Email address
            </label>

            <div style={{ position: 'relative' }}>
              <Image
                src="/email.png"
                alt="Email"
                width={18}
                height={18}
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  objectFit: 'contain',
                  zIndex: 1,
                }}
              />

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                style={{
                  width: '100%',
                  border: '1px solid #E5E7EB',
                  borderRadius: 8,
                  padding: '10px 12px 10px 34px',
                  fontSize: 14,
                  color: '#111827',
                  background: '#fff',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = '#4F46E5')
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = '#E5E7EB')
                }
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: '#6B7280',
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Password
            </label>

            <div style={{ position: 'relative' }}>
              <Image
                src="/password-icon.png"
                alt="Password"
                width={18}
                height={18}
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  objectFit: 'contain',
                  zIndex: 1,
                }}
              />

              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                style={{
                  width: '100%',
                  border: '1px solid #E5E7EB',
                  borderRadius: 8,
                  padding: '10px 40px 10px 34px',
                  fontSize: 14,
                  color: '#111827',
                  background: '#fff',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = '#4F46E5')
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = '#E5E7EB')
                }
              />

              {/* Password visibility button */}
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                aria-label={
                  showPass ? 'Hide password' : 'Show password'
                }
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Image
                  src={
                    showPass
                      ? '/visible.web.png'
                      : '/hide.web.png'
                  }
                  alt={
                    showPass
                      ? 'Hide password'
                      : 'Show password'
                  }
                  width={20}
                  height={20}
                  style={{ objectFit: 'contain' }}
                />
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#818CF8' : '#4F46E5',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? (
              <>Checking credentials…</>
            ) : (
              <>Sign in as Admin</>
            )}
          </button>
        </form>

        {/* Admin notice */}
        <div
          style={{
            marginTop: 20,
            padding: '12px 14px',
            background: '#FEF3C7',
            borderRadius: 8,
            fontSize: 12,
            color: '#92400E',
            lineHeight: 1.8,
            border: '1px solid #FDE68A',
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
          }}
        >
          <Image
            src="/danger.png"
            alt="Warning"
            width={18}
            height={18}
            style={{
              objectFit: 'contain',
              flexShrink: 0,
              marginTop: 2,
            }}
          />

          <div>
            <div
              style={{
                fontWeight: 700,
                marginBottom: 2,
              }}
            >
              Admin access only
            </div>

            Regular user accounts will be rejected. Contact your
            system administrator if you need access.
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: 24,
          fontSize: 12,
          color: 'rgba(255,255,255,0.5)',
        }}
      >
        Authorized administrators only · Bigkas LMS
      </div>
    </div>
  )
}