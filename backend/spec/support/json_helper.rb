# spec/support/json_helpers.rb
module JsonHelpers
    def json
      JSON.parse(response.body)
    rescue JSON::ParserError
      {}
    end
  end
  