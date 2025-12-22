# my-otel-examples
example repo for testing otel in a few different languages/projects

# running
look at the devspace.yaml for how setup happens

## local vars for otel
```sh
OTEL_EXPORTER_OTLP_PROTOCOL=grpc OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
```


# todo
## bun-expo
* create example using expo
* eventually extend to create an example end user/browser connecting to otel