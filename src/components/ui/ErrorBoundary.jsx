import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error(
      "Productivity app error:",
      error
    );

    console.error(
      "Error boundary details:",
      errorInfo
    );
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetView = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px",
          background:
            "var(--app-background, #08090c)",
          color:
            "var(--text-primary, #f5f5f7)",
        }}
      >
        <section
          style={{
            width: "100%",
            maxWidth: "520px",
            padding: "32px",
            borderRadius: "24px",
            border:
              "1px solid var(--border-color, rgba(255,255,255,0.1))",
            background:
              "var(--card-background, rgba(255,255,255,0.05))",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              margin: "0 auto 20px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                "rgba(255,69,58,0.12)",
              color: "#ff453a",
              fontSize: "24px",
              fontWeight: 700,
            }}
          >
            !
          </div>

          <p
            style={{
              margin: "0 0 8px",
              fontSize: "12px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              opacity: 0.55,
            }}
          >
            Recovery Mode
          </p>

          <h1
            style={{
              margin: "0 0 12px",
              fontSize: "24px",
              lineHeight: 1.2,
            }}
          >
            Something went wrong
          </h1>

          <p
            style={{
              margin: "0 auto 24px",
              maxWidth: "400px",
              lineHeight: 1.6,
              opacity: 0.65,
            }}
          >
            The dashboard encountered an unexpected
            error. Your saved journey data has not
            been intentionally deleted.
          </p>

          {this.state.error?.message && (
            <details
              style={{
                marginBottom: "24px",
                textAlign: "left",
                fontSize: "12px",
                opacity: 0.55,
              }}
            >
              <summary>
                Technical details
              </summary>

              <pre
                style={{
                  marginTop: "10px",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                }}
              >
                {this.state.error.message}
              </pre>
            </details>
          )}

          <div
            style={{
              display: "flex",
              gap: "10px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="primary-button"
              onClick={this.handleReload}
            >
              Reload App
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={this.handleResetView}
            >
              Try Again
            </button>
          </div>
        </section>
      </main>
    );
  }
}

export default ErrorBoundary;