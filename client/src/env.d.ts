declare module '*.css' {
  const stylesheet: CSSStyleSheet;
  export default stylesheet;
}

declare module '*.scss' {
  import { CSSResultGroup } from 'lit';
  const styles: CSSResultGroup;
  export default styles;
}
