"use client"

import { SVGProps, useState } from "react"
import { useTheme } from "next-themes"
import { JSX } from "react/jsx-runtime"

export default function Subscribe() {
  const [showAlert, setShowAlert] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  
  const { theme } = useTheme()

  const addPhoneNumber = async (number: string) => {
    try {
      const response = await fetch('/api/sms/add-number', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ number }),
      });

      if (!response.ok) {
        throw new Error('Failed to add phone number');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error adding phone number:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setShowAlert(true)

    try {
      await addPhoneNumber(phoneNumber)
      setIsSubscribed(true)
      setErrorMessage("")
    } catch (error) {
      setIsSubscribed(false)
      setErrorMessage("Failed to subscribe. Please try again or contact support.")
    }
  }

  return (
    <div
      className={`flex min-h-screen flex-col items-center justify-center ${
        theme === "dark" ? "dark:bg-gray-900" : "bg-white"
      } bg-[url('https://picsum.photos/1920/1080')] bg-cover bg-center bg-fixed`}
    >
      <div className="relative w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-6 shadow-lg before:absolute before:inset-0 before:-z-10 before:rounded-lg before:bg-white before:dark:bg-gray-800 before:opacity-80 before:content-['']">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground dark:text-white">
            Subscribe to Alerts & Warnings
          </h2>
          <p className="text-muted-foreground dark:text-gray-400">
            Stay informed about latest alerts and warnings. Enter your phone number to subscribe to Project Sensei.
          </p>
          <form className="space-y-2" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-foreground dark:text-gray-300"
              >
                Phone Number
              </label>
              <div className="mt-1">
                <input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 555-5555"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Subscribe
            </button>
          </form>
        </div>
      </div>
      {showAlert && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
            {isSubscribed ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <CircleCheckIcon className="h-12 w-12 text-green-500" />
                </div>
                <h3 className="text-xl font-bold text-foreground dark:text-white">
                  Subscription Successful
                </h3>
                <p className="text-muted-foreground dark:text-gray-400">
                  Thank you for subscribing to our alerts and warnings. You will receive updates on your phone.
                </p>
                <button
                  onClick={() => setShowAlert(false)}
                  className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <TriangleAlertIcon className="h-12 w-12 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-foreground dark:text-white">
                  Subscription Failed
                </h3>
                <p className="text-muted-foreground dark:text-gray-400">
                  {errorMessage || "There was an error subscribing you to our alerts and warnings. Please try again or contact our admin at "}
                  {!errorMessage && (
                    <a href="mailto:r04nx.work@gmail.com" className="text-primary underline">
                      r04nx.work@gmail.com
                    </a>
                  )}
                  {!errorMessage && " for assistance."}
                </p>
                <button
                  onClick={() => setShowAlert(false)}
                  className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function CircleCheckIcon(props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function TriangleAlertIcon(props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  )
}