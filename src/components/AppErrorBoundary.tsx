import { Component, type ErrorInfo, type ReactNode } from "react";
import { DestinationState } from "@/components/DestinationState";

interface Props { children: ReactNode }
interface State { failed: boolean }

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Destination render failed", error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="flex min-h-screen bg-background text-foreground">
          <DestinationState kind="error" title="This page lost its place" description="Something interrupted this view. A fresh start should restore it." actionLabel="Reload page" onAction={() => window.location.reload()} />
        </main>
      );
    }
    return this.props.children;
  }
}