require "test_helper"

class PlaceTest < ActiveSupport::TestCase
  test "factory or basic build is valid" do
    place = Place.new(name: "Test place")
    assert place.valid?
  end
end
