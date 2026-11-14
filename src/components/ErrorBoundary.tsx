import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message =
      error instanceof Error
        ? error.message
        : 'Error inesperado en la interfaz.';
    return { hasError: true, errorMessage: message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="min-h-screen flex items-center justify-center bg-[#B2B2B2] p-6 text-black"
        >
          <div className="max-w-md w-full bg-[#E9E3E6] border border-[#736F72] rounded-lg shadow-lg p-6 space-y-4">
            <h1 className="text-base font-bold text-black">
              Se produjo un error inesperado en FotoAnexo Pro
            </h1>
            <p className="text-xs text-black leading-relaxed">
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs font-semibold text-black bg-[#9A8F97] border border-[#736F72] rounded-md hover:bg-[#736F72] transition-colors cursor-pointer"
            >
              Recargar aplicación
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

