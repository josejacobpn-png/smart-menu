import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "./ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  private handleReset = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/auth?clear=true";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Ops! Algo deu errado</h2>
              <p className="text-muted-foreground">
                Ocorreu um erro inesperado que impediu o carregamento do sistema.
              </p>
              {this.state.error && (
                <div className="mt-4 p-3 bg-muted rounded-md text-left overflow-auto max-h-32">
                  <code className="text-[10px] text-muted-foreground whitespace-pre-wrap">
                    {this.state.error.toString()}
                  </code>
                </div>
              )}
            </div>
            <Button 
                onClick={this.handleReset}
                className="w-full h-12 gradient-primary gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Limpar Cache e Reiniciar
            </Button>
            <p className="text-xs text-muted-foreground pt-2">
                Isso removerá sua sessão atual e tentará carregar o sistema novamente do zero.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
