import React, { useState } from 'react';
import { Mail, Send } from 'lucide-react';
import { getApiUrl } from '@/config/apiConfig';

interface EmailShareFormProps {
  shareUrl: string;
  senderName: string;
}

const EmailShareForm: React.FC<EmailShareFormProps> = ({ shareUrl, senderName }) => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recipientEmail)) {
        throw new Error('Please enter a valid email address');
      }

      // Send the email
      const response = await fetch(getApiUrl('/api/send-email'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shareUrl,
          senderName,
          recipientEmail,
          recipientName,
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      // Show success message
      setSuccess(true);

      // Reset form
      setRecipientEmail('');
      setRecipientName('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
      <h3 className="text-md font-medium text-gray-900 mb-3 flex items-center gap-2">
        <Mail className="w-4 h-4" />
        Email this gift
      </h3>

      {success ? (
        <div className="p-3 bg-green-50 text-green-700 rounded-md mb-3">
          Email sent successfully!
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="recipientEmail" className="block text-sm font-medium text-gray-700 mb-1">
              Recipient Email*
            </label>
            <input
              type="email"
              id="recipientEmail"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="friend@example.com"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="recipientName" className="block text-sm font-medium text-gray-700 mb-1">
              Recipient Name (Optional)
            </label>
            <input
              type="text"
              id="recipientName"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Friend's name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
              Personal Message (Optional)
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal message..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading || !recipientEmail}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-in-out"
          >
            {isLoading ? (
              'Sending...'
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Email
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};

export default EmailShareForm;
