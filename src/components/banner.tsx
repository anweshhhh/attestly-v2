export function Banner(props: { notice?: string; error?: string }) {
  if (props.error) {
    return <div className="banner banner-error">{props.error}</div>;
  }

  if (props.notice) {
    return <div className="banner banner-notice">{props.notice}</div>;
  }

  return null;
}
