import React from "react";
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    // می‌توانید لاگ خطا را اینجا ارسال کنید
  }
  render() {
    if (this.state.hasError) {
      return <h2>مشکلی در بارگذاری صفحه رخ داده است.</h2>;
    }
    return this.props.children;
  }
}
export default ErrorBoundary; 