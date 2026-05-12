// src/pages/app/PrivacyPage.tsx
export default function PrivacyPage() {
  return (
    <section className="container py-16 max-w-3xl">
      <h1 className="heading heading-lg">Privacy Policy</h1>

      <p className="text-sm text-muted mt-4">
        Your privacy is important to us. This Privacy Policy explains how Home
        Away from Home collects, uses, and protects your personal information.
      </p>

      <div className="mt-10 s-lg text-sm">
        <div className="card">
          <h2 className="heading heading-sm">1. Information We Collect</h2>
          <p className="text-muted mt-2">
            We may collect personal information such as your name, email
            address, phone number, booking details, and payment-related
            information when you use our services.
          </p>
        </div>

        <div className="card">
          <h2 className="heading heading-sm">2. How We Use Your Information</h2>
          <ul className="mt-2 list-disc list-inside text-muted s-xs">
            <li>To process bookings and payments</li>
            <li>To communicate with you about your stay</li>
            <li>To improve our services and customer experience</li>
            <li>To comply with legal obligations</li>
          </ul>
        </div>

        <div className="card">
          <h2 className="heading heading-sm">3. Data Protection</h2>
          <p className="text-muted mt-2">
            We implement reasonable security measures to protect your data from
            unauthorized access, alteration, or disclosure.
          </p>
        </div>

        <div className="card">
          <h2 className="heading heading-sm">4. Third-Party Services</h2>
          <p className="text-muted mt-2">
            We may share necessary information with trusted third-party service
            providers strictly for operating our services (e.g., payment
            processors).
          </p>
        </div>

        <div className="card">
          <h2 className="heading heading-sm">5. Updates to This Policy</h2>
          <p className="text-muted mt-2">
            This Privacy Policy may be updated from time to time. Continued use
            of our services indicates acceptance of the revised policy.
          </p>
        </div>
      </div>

      <p className="mt-10 text-xs text-muted">
        Last updated: {new Date().toLocaleDateString()}
      </p>
    </section>
  );
}
