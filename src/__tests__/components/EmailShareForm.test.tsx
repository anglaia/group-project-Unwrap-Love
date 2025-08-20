import { render, screen, fireEvent, waitFor } from '../test-utils';
import EmailShareForm from '@/components/EmailShareForm';
import '@testing-library/jest-dom';
import { getApiUrl } from '@/config/apiConfig';

// Mock the getApiUrl function
jest.mock('@/config/apiConfig', () => ({
    getApiUrl: jest.fn(() => 'http://mock-api.com/api/send-email')
}));

// Mock the fetch function
global.fetch = jest.fn();

describe('EmailShareForm Component', () => {
    const defaultProps = {
        shareUrl: 'https://example.com/share/abc123',
        senderName: 'Test Sender'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (global.fetch as jest.Mock).mockImplementation(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ success: true })
            })
        );
    });

    it('renders the form correctly', () => {
        render(<EmailShareForm {...defaultProps} />);

        // Check for email form heading
        expect(screen.getByText('Email this gift')).toBeInTheDocument();

        // Check for form fields
        expect(screen.getByLabelText(/Recipient Email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Recipient Name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Personal Message/i)).toBeInTheDocument();

        // Check for submit button
        expect(screen.getByRole('button', { name: /Send Email/i })).toBeInTheDocument();
    });

    it('validates email input before submitting', async () => {
        // Mock the window.fetch directly to spy on calls
        const mockFetch = jest.fn();
        global.fetch = mockFetch;

        render(<EmailShareForm {...defaultProps} />);

        // Set invalid email
        const emailInput = screen.getByLabelText(/Recipient Email/i);
        fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

        // Try to submit the form
        const submitButton = screen.getByRole('button', { name: /Send Email/i });
        fireEvent.click(submitButton);

        // Wait a bit to ensure async operations would complete
        await waitFor(() => { });

        // Validation should prevent the fetch call
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('submits the form successfully', async () => {
        render(<EmailShareForm {...defaultProps} />);

        // Fill the form
        const emailInput = screen.getByLabelText(/Recipient Email/i);
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

        const nameInput = screen.getByLabelText(/Recipient Name/i);
        fireEvent.change(nameInput, { target: { value: 'Test Recipient' } });

        const messageInput = screen.getByLabelText(/Personal Message/i);
        fireEvent.change(messageInput, { target: { value: 'Test message content' } });

        // Submit the form
        const submitButton = screen.getByRole('button', { name: /Send Email/i });
        fireEvent.click(submitButton);

        // Should show loading state
        expect(screen.getByText('Sending...')).toBeInTheDocument();

        // Should call the API with correct data
        expect(getApiUrl).toHaveBeenCalledWith('/api/send-email');
        expect(global.fetch).toHaveBeenCalledWith(
            'http://mock-api.com/api/send-email',
            expect.objectContaining({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    shareUrl: defaultProps.shareUrl,
                    senderName: defaultProps.senderName,
                    recipientEmail: 'test@example.com',
                    recipientName: 'Test Recipient',
                    message: 'Test message content',
                }),
            })
        );

        // Should show success message
        await waitFor(() => {
            expect(screen.getByText(/Email sent successfully/i)).toBeInTheDocument();
        });

        // Form should be hidden
        await waitFor(() => {
            expect(screen.queryByLabelText(/Recipient Email/i)).not.toBeInTheDocument();
        });
    });

    it('handles API errors', async () => {
        // Mock fetch to return an error
        (global.fetch as jest.Mock).mockImplementation(() =>
            Promise.resolve({
                ok: false,
                json: () => Promise.resolve({ error: 'API error message' })
            })
        );

        render(<EmailShareForm {...defaultProps} />);

        // Fill the form with valid data
        const emailInput = screen.getByLabelText(/Recipient Email/i);
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

        // Submit the form
        const submitButton = screen.getByRole('button', { name: /Send Email/i });
        fireEvent.click(submitButton);

        // Should show error message from API
        await waitFor(() => {
            expect(screen.getByText(/API error message/i)).toBeInTheDocument();
        });

        // Form should still be visible
        expect(screen.getByLabelText(/Recipient Email/i)).toBeInTheDocument();
    });
}); 