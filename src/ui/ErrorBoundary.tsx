import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@fluentui/react-components";

interface Props {
  children: ReactNode;
}

interface State {
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("okr4me UI error", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="center">
        <section className="setup-panel">
          <h1>okr4me konnte die Ansicht nicht laden</h1>
          <p>{this.state.error.message}</p>
          <Button onClick={() => window.location.reload()}>Neu laden</Button>
        </section>
      </main>
    );
  }
}
