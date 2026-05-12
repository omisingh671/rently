// src/pages/app/TermsPage.tsx
export default function TermsPage() {
  return (
    <section className="container max-w-3xl">
      <h1 className="heading heading-lg">Terms & Conditions</h1>

      <p className="text-sm text-muted mt-4">
        These Terms & Conditions govern your use of the Home Away from Home
        website and services. By accessing or using our services, you agree to
        these terms.
      </p>

      <div className="mt-10 s-lg text-sm">
        <div className="card">
          <h2 className="heading heading-sm">1. Bookings & Payments</h2>
          <p className="text-muted mt-2">
            All bookings are subject to availability and confirmation. Payments
            must be completed as per the agreed pricing at the time of booking.
          </p>
        </div>

        <div className="card">
          <h2 className="heading heading-sm">2. Cancellations & Refunds</h2>
          <p className="text-muted mt-2">
            Cancellation and refund policies may vary based on the booking type
            and duration. Please contact our support team for specific details.
          </p>
        </div>

        <div className="card">
          <h2 className="heading heading-sm">3. Guest Responsibilities</h2>
          <ul className="mt-2 list-disc list-inside text-muted s-xs">
            <li>Guests must provide accurate information during booking</li>
            <li>Property rules must be followed during the stay</li>
            <li>Any damage caused may be chargeable</li>
          </ul>
        </div>

        <div className="card">
          <h2 className="heading heading-sm">4. Limitation of Liability</h2>
          <p className="text-muted mt-2">
            Home Away from Home is not liable for indirect, incidental, or
            consequential damages arising from the use of our services.
          </p>
        </div>

        <div className="card">
          <h2 className="heading heading-sm">5. Governing Law</h2>
          <p className="text-muted mt-2">
            These terms are governed by and interpreted in accordance with the
            laws of India.
          </p>
        </div>
      </div>

      <p className="mt-10 text-xs text-muted">
        Last updated: {new Date().toLocaleDateString()}
      </p>
    </section>
  );
}
