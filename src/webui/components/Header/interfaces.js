/**
 * @prettier
 * @flow
 */

export interface IProps {
  username?: string;
  onLogout: Function;
  toggleLoginModal: Function;
  scope: string;
  search: string;
  packages: string[];
  onSearch: (event: SyntheticKeyboardEvent<HTMLInputElement>) => void;
}

export interface IState {
  anchorEl?: any;
  openInfoDialog: boolean;
  registryUrl: string;
  packages: string[];
  showMobileNavBar: boolean;
}
