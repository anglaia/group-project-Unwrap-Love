import { render, screen, fireEvent } from '../test-utils';
import { RecordingProgress } from '@/components/RecordingProgress';
import '@testing-library/jest-dom';

describe('RecordingProgress Component', () => {
    const defaultProps = {
        isRecording: true,
        currentTime: 65, // 1:05
        maxTime: 180, // 3:00
        onStop: jest.fn(),
    };

    it('renders correctly when recording', () => {
        render(<RecordingProgress {...defaultProps} />);

        // Check time display
        expect(screen.getByText('1:05')).toBeInTheDocument();

        // Check for stop button
        const stopButton = screen.getByRole('button');
        expect(stopButton).toBeInTheDocument();

        // Check recording indicator exists
        const indicator = document.querySelector('.bg-red-500.animate-\\[pulse_1\\.5s_ease-in-out_infinite\\]');
        expect(indicator).toBeInTheDocument();

        // Check progress bar exists - just verify it renders, don't check styles
        const progressContainer = document.querySelector('.w-48.h-2.bg-gray-200.rounded-full');
        expect(progressContainer).toBeInTheDocument();
    });

    it('does not render when not recording', () => {
        render(<RecordingProgress {...defaultProps} isRecording={false} />);

        // No elements should be rendered
        expect(screen.queryByText('1:05')).not.toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('calls onStop when stop button is clicked', () => {
        render(<RecordingProgress {...defaultProps} />);

        // Click the stop button
        const stopButton = screen.getByRole('button');
        fireEvent.click(stopButton);

        // Check if onStop was called
        expect(defaultProps.onStop).toHaveBeenCalledTimes(1);
    });
}); 