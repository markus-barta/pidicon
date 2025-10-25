{
  description = "Pidicon development environment (Devenv + Flakes)";

  inputs = {
    nixpkgs.url = "nixpkgs/nixpkgs-unstable";
    devenv.url  = "github:cachix/devenv";
  };

  nixConfig.allow-dirty = true;

  outputs = { self, nixpkgs, devenv, ... }@inputs:
    let
      system = "x86_64-darwin";
      pkgs = import nixpkgs {
        inherit system;
        config.allowUnfree = true;
      };

      # Build the Devenv project directly
      project = devenv.lib.mkShell {
        inherit inputs pkgs;
        modules = [ ./devenv.nix ];
      };

      # Modern Devenv outputs always have 'shell'
      shellOut =
        if project ? shell then project.shell
        else if project ? devShell then project.devShell
        else if project ? shells && project.shells ? default then project.shells.default
#        else pkgs.mkShell { shellHook = "echo 'Fallback mkShell'"; };
        else pkgs.mkShell { modules = [ ./devenv.nix ]; };
    in
    {
      devShells.${system}.default = shellOut;
      packages.${system}.default = shellOut;
    };
}
