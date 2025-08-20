import { render, screen, fireEvent } from '../test-utils';
import { MicrophoneIcon } from '@/components/MicrophoneIcon';
import '@testing-library/jest-dom';

describe('MicrophoneIcon Component', () => {
    const mockOnClick = jest.fn();

    beforeEach(() => {
        mockOnClick.mockClear();
    });

    it('renders correctly when not recording', () => {
        render(<MicrophoneIcon isRecording={false} onClick={mockOnClick} />);

        // Check image is rendered with correct attributes
        const image = screen.getByAltText('Microphone');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('src');

        // When not recording, the image should not have the opacity-80 class
        expect(image).not.toHaveClass('opacity-80');

        // Button should be present
        const button = screen.getByRole('button', { name: 'Record voice' });
        expect(button).toBeInTheDocument();
    });

    it('renders correctly when recording', () => {
        render(<MicrophoneIcon isRecording={true} onClick={mockOnClick} />);

        // Check that the image has the opacity-80 class when recording
        const image = screen.getByAltText('Microphone');
        expect(image).toHaveClass('opacity-80');

        // Container should have the scale-110 class when recording
        const container = image.parentElement;
        expect(container).toHaveClass('scale-110');
    });

    it('calls onClick handler when clicked', () => {
        render(<MicrophoneIcon isRecording={false} onClick={mockOnClick} />);

        // Click the button
        fireEvent.click(screen.getByRole('button', { name: 'Record voice' }));

        // Verify the click handler was called
        expect(mockOnClick).toHaveBeenCalledTimes(1);
    });
}); 