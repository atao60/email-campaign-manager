# User Interface Output and System Telemetry

In software engineering, it's particularly important to maintain a distinction between User Interface Output and System Telemetry.

Mixing them up can harm both the user experience and the application monitoring:

1. User Communication vs. System Telemetry

- User Output: This is the direct response to a human's command. When a user runs merge listA.csv listB.csv, they expect a clean, human-readable confirmation like: "Successfully merged lists into data/merged.csv".

- Application Logging: This is telemetry meant for developers, system administrators, or log aggregation tools (like Datadog, Kibana, or Splunk). It records how the system is behaving under the hood.

1. Structured message vs. user readable message

Often the log message are structured to be used by automatic tools, e.g., in json. Therefore not ready to be read by a user.

3. The UNIX Philosophy

Standard UNIX command-line principles dictate a strict separation of streams:

- stdout (Standard Output via console.log): Used strictly for the expected data or outcome of the command. If a user pipes your command into another tool (e.g., my-cli merge inputs | grep "Success"), they only want the data, not timestamped log metadata.

- Log Files / stderr: Used for debugging, warnings, and internal state.

## CLI output

With a Command Line Interface (CLI), the terminal serves as the actual User Interface (UI). Therefore, standard console.log is used to communicate directly with the human user, rather than a logger which is designed for system observability.

The CLI port should absolutely use the LoggerPort when something goes wrong at the system level, or if you implement a "verbose mode" for debugging.
